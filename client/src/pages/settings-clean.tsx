// Clean version of autocomplete implementation
import { useEffect, useRef } from 'react';

export function useGooglePlacesAutocomplete(isEditingProfile: boolean) {
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!window.google?.maps?.places || !isEditingProfile) return;

    const initAutocomplete = () => {
      const addressInput = document.querySelector('input[name="homeBaseAddress"]') as HTMLInputElement;
      
      if (!addressInput) {
        setTimeout(initAutocomplete, 300);
        return;
      }

      console.log('✅ Initializing Google Places Autocomplete');

      try {
        const autocomplete = new window.google.maps.places.Autocomplete(addressInput, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            addressInput.value = place.formatted_address;
            addressInput.dispatchEvent(new Event('input', { bubbles: true }));
            addressInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Address updated:', place.formatted_address);
          }
        });

        addressInput.addEventListener('input', () => {
          setTimeout(() => {
            document.querySelectorAll('.pac-container').forEach(container => {
              const element = container as HTMLElement;
              element.style.display = 'block';
              element.style.visibility = 'visible';
              element.style.opacity = '1';
              element.style.zIndex = '9999';
            });
          }, 100);
        });

        autocompleteRef.current = autocomplete;
        console.log('✅ Autocomplete setup complete');

      } catch (error) {
        console.error('❌ Autocomplete error:', error);
      }
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      document.querySelectorAll('.pac-container').forEach(container => {
        container.remove();
      });
    };
  }, [isEditingProfile]);

  return autocompleteRef;
}