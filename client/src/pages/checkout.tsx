import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, CreditCard, Shield, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, Client } from "@shared/schema";
import { format } from "date-fns";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_51234567890");

const CheckoutForm = ({ invoice, client }: { invoice: Invoice; client: Client | undefined }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const confirmPaymentMutation = useMutation({
    mutationFn: async (data: { paymentIntentId: string; invoiceId: number }) => {
      return apiRequest("POST", "/api/confirm-payment", data);
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful",
        description: "Thank you for your payment!",
      });
      // Redirect to success page or back to invoices
      window.location.href = "/invoice";
    },
    onError: (error: any) => {
      toast({
        title: "Payment Confirmation Failed",
        description: error.message || "Unable to confirm payment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/invoice`,
        },
        redirect: 'if_required'
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment in backend
        confirmPaymentMutation.mutate({
          paymentIntentId: paymentIntent.id,
          invoiceId: invoice.id,
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Summary */}
      <Card className="bg-dark-card border-steel/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {client && (
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={client.photoUrl || undefined} 
                  alt={client.name} 
                />
                <AvatarFallback className="bg-steel text-white">
                  {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-white">{client.name}</div>
                <div className="text-sm text-steel">
                  {format(new Date(invoice.createdAt!), 'MMM d, yyyy • h:mm a')}
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2 border-t border-steel/20 pt-4">
            <div className="flex justify-between text-white">
              <span>Service Amount:</span>
              <span>${invoice.subtotal}</span>
            </div>
            {parseFloat(invoice.tip) > 0 && (
              <div className="flex justify-between text-white">
                <span>Tip:</span>
                <span>${invoice.tip}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gold border-t border-steel/20 pt-2">
              <span>Total:</span>
              <span>${invoice.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card className="bg-dark-card border-steel/20">
        <CardHeader>
          <CardTitle className="text-white">Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement 
            options={{
              layout: "tabs",
              defaultValues: {
                billingDetails: {
                  name: client?.name || '',
                  email: client?.email || '',
                }
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-dark-card border-steel/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-sm text-steel">
            <Shield className="w-4 h-4 text-gold" />
            <span>Secure payment powered by Stripe. Your payment information is encrypted and secure.</span>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full gradient-gold text-charcoal font-semibold h-12 tap-feedback"
        disabled={!stripe || !elements || isProcessing || confirmPaymentMutation.isPending}
      >
        {isProcessing || confirmPaymentMutation.isPending ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full" />
            <span>Processing Payment...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Pay ${invoice.total}</span>
          </div>
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();

  const { data: invoice, isLoading: invoiceLoading } = useQuery<Invoice>({
    queryKey: [`/api/invoices/${invoiceId}`],
    enabled: !!invoiceId,
  });

  const { data: client } = useQuery<Client>({
    queryKey: [`/api/clients/${invoice?.clientId}`],
    enabled: !!invoice?.clientId,
  });

  useEffect(() => {
    if (invoice && parseFloat(invoice.total) > 0) {
      // Create PaymentIntent when component loads
      apiRequest("POST", "/api/create-payment-intent", { 
        amount: parseFloat(invoice.total),
        currency: "usd" 
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            toast({
              title: "Payment Setup Failed",
              description: "Unable to initialize payment. Please try again.",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          toast({
            title: "Payment Setup Failed",
            description: error.message || "Stripe payment is not configured",
            variant: "destructive",
          });
        });
    }
  }, [invoice, toast]);

  if (invoiceLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-dark-bg text-white p-4">
        <div className="text-center py-8">
          <h1 className="text-xl font-bold mb-2">Invoice Not Found</h1>
          <Link href="/invoice">
            <Button variant="link" className="text-gold">
              Back to Invoices
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen bg-dark-bg text-white p-4">
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Payment Completed</h1>
          <p className="text-steel mb-4">This invoice has already been paid.</p>
          <Link href="/invoice">
            <Button className="gradient-gold text-charcoal">
              Back to Invoices
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-dark-bg text-white">
        {/* Header */}
        <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
          <div className="flex items-center space-x-3">
            <Link href="/invoice">
              <Button variant="ghost" size="sm" className="text-steel hover:text-white p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">Checkout</h1>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-steel">Setting up payment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="bg-charcoal p-4 sticky top-0 z-50 border-b border-steel/20">
        <div className="flex items-center space-x-3">
          <Link href="/invoice">
            <Button variant="ghost" size="sm" className="text-steel hover:text-white p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-white">Checkout</h1>
        </div>
      </header>

      <main className="p-4">
        {/* Make SURE to wrap the form in <Elements> which provides the stripe context. */}
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm invoice={invoice} client={client} />
        </Elements>
      </main>
    </div>
  );
}
