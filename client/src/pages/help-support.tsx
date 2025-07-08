import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  Mail, 
  MessageSquare, 
  Shield, 
  CreditCard, 
  Calendar,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: React.ReactNode;
}

const faqData: FAQItem[] = [
  {
    id: 'premium-guarantee',
    question: 'What is the Premium Guarantee?',
    answer: 'Try Clippr Pro risk-free for 30 days. If you\'re not satisfied, request a full refund — no hassle. You can also cancel your subscription anytime directly from the Settings page.',
    category: 'Premium & Billing',
    icon: <Shield className="w-4 h-4" />
  },
  {
    id: 'cancel-subscription',
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel your Premium subscription anytime from Settings → Subscription Management. Your premium access will continue until the end of your current billing period.',
    category: 'Premium & Billing',
    icon: <CreditCard className="w-4 h-4" />
  },
  {
    id: 'refund-policy',
    question: 'How do I request a refund?',
    answer: 'If you\'re within your first 30 days of Premium, you can request a full refund from Settings → Subscription Management. The refund will be processed immediately and you\'ll be downgraded to Basic plan.',
    category: 'Premium & Billing',
    icon: <CreditCard className="w-4 h-4" />
  },
  {
    id: 'appointment-limits',
    question: 'What are the appointment limits?',
    answer: 'Basic plan allows 15 appointments per month. Premium plan offers unlimited appointments. The counter resets on the first day of each month.',
    category: 'Features',
    icon: <Calendar className="w-4 h-4" />
  },
  {
    id: 'client-management',
    question: 'How do I manage my clients?',
    answer: 'Go to the Clients page to add, edit, and track your client information. You can store contact details, service history, and notes for each client.',
    category: 'Features',
    icon: <Users className="w-4 h-4" />
  },
  {
    id: 'booking-link',
    question: 'How do I share my booking link?',
    answer: 'Your public booking link is available in Settings → Public Booking Link. Share this with clients so they can book appointments directly with you.',
    category: 'Features',
    icon: <MessageSquare className="w-4 h-4" />
  },
  {
    id: 'working-hours',
    question: 'Can I set custom working hours?',
    answer: 'Premium users can set custom working hours for each day of the week in Settings → Working Hours. Basic users have standard working hours.',
    category: 'Features',
    icon: <Settings className="w-4 h-4" />
  },
  {
    id: 'photo-storage',
    question: 'How much photo storage do I get?',
    answer: 'Basic plan includes 50MB of photo storage. Premium plan includes 1GB of storage for your portfolio gallery.',
    category: 'Features',
    icon: <Settings className="w-4 h-4" />
  },
  {
    id: 'sms-notifications',
    question: 'How do SMS notifications work?',
    answer: 'SMS confirmations are sent to clients when appointments are booked. Basic plan includes 15 SMS per month, Premium offers unlimited SMS.',
    category: 'Features',
    icon: <MessageSquare className="w-4 h-4" />
  },
  {
    id: 'data-security',
    question: 'Is my data secure?',
    answer: 'Yes, we use industry-standard encryption and security measures. Your client data and payment information are protected with bank-level security.',
    category: 'Security',
    icon: <Shield className="w-4 h-4" />
  }
];

export default function HelpSupport() {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const categories = ['All', 'Premium & Billing', 'Features', 'Security'];

  const filteredFAQs = selectedCategory === 'All' 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory);

  const handleFAQToggle = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create mailto link for now (can be replaced with actual email service)
      const mailtoLink = `mailto:customersupport@kall-e.com?subject=${encodeURIComponent(supportForm.subject)}&body=${encodeURIComponent(
        `Name: ${supportForm.name}\nEmail: ${supportForm.email}\n\nMessage:\n${supportForm.message}`
      )}`;
      
      window.open(mailtoLink, '_blank');
      
      toast({
        title: "Support Request Sent",
        description: "Your email client has been opened. Please send the email to complete your support request.",
      });

      // Reset form
      setSupportForm({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open email client. Please email us directly at customersupport@kall-e.com",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/settings">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-steel hover:text-white hover:bg-steel/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-white">Help & Support</h1>
            <p className="text-steel">Find answers to common questions or contact our support team</p>
          </div>
          
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* Quick Contact */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-blue-400 font-medium">Email Support</h3>
                  <p className="text-steel text-sm mt-1">
                    Have a question? Email us at{' '}
                    <a 
                      href="mailto:customersupport@kall-e.com" 
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      customersupport@kall-e.com
                    </a>
                  </p>
                  <p className="text-steel text-xs mt-1">
                    We typically respond within 24 hours during business days
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category 
                    ? "bg-gold text-charcoal hover:bg-gold/90" 
                    : "border-steel/20 text-steel hover:text-white hover:bg-steel/10"
                  }
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="space-y-3">
              {filteredFAQs.map((faq) => (
                <div key={faq.id} className="border border-steel/20 rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleFAQToggle(faq.id)}
                    className="w-full px-4 py-3 text-left hover:bg-steel/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-gold">{faq.icon}</div>
                        <span className="text-white font-medium">{faq.question}</span>
                      </div>
                      {expandedFAQ === faq.id ? (
                        <ChevronDown className="w-4 h-4 text-steel" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-steel" />
                      )}
                    </div>
                  </button>
                  {expandedFAQ === faq.id && (
                    <div className="px-4 pb-4 border-t border-steel/20">
                      <p className="text-steel text-sm leading-relaxed mt-3">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card className="bg-dark-card border-steel/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={supportForm.name}
                    onChange={(e) => setSupportForm({...supportForm, name: e.target.value})}
                    className="bg-charcoal border-steel/20 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({...supportForm, email: e.target.value})}
                    className="bg-charcoal border-steel/20 text-white"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="subject" className="text-white">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({...supportForm, subject: e.target.value})}
                  className="bg-charcoal border-steel/20 text-white"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="message" className="text-white">Message</Label>
                <Textarea
                  id="message"
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({...supportForm, message: e.target.value})}
                  className="bg-charcoal border-steel/20 text-white min-h-[120px]"
                  placeholder="Please describe your issue in detail..."
                  required
                />
              </div>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gold text-charcoal hover:bg-gold/90 font-medium"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin mr-2"></div>
                    Opening Email...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    Send Support Request
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Premium Guarantee Highlight */}
        <Card className="bg-gradient-to-r from-gold/10 to-amber-400/10 border-gold/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-gold/20 rounded-full p-3">
                <Shield className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h3 className="text-gold font-bold text-lg mb-2">Premium Guarantee</h3>
                <p className="text-white text-sm leading-relaxed">
                  Try Clippr Pro risk-free for 30 days. If you're not satisfied, request a full refund — no hassle. 
                  You can also cancel your subscription anytime directly from the Settings page.
                </p>
                <div className="flex items-center mt-3 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>30-day money-back guarantee</span>
                </div>
                <div className="flex items-center mt-1 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}