import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  Text,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { validators } from '../../lib/utils';
import { maxLength } from 'zod';

type InputType = 'text' | 'number' | 'currency' | 'phone' | 'email';

interface ValidatedTextInputProps extends TextInputProps {
  value: string;
  onTextChange: (text: string) => void;
  required?: boolean;
  errorMessage?: string;
  type?: InputType;
  showErrorMessage?: boolean;
}

const ValidatedRequiredTextInput: React.FC<ValidatedTextInputProps> = ({
  value,
  onTextChange,
  required = false,
  errorMessage = 'This field is required.',
  type = 'text',
  showErrorMessage = false,
  ...props
}) => {
  const [touched, setTouched] = useState(false);

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setTouched(true);
    if (props.onBlur) props.onBlur(e);
  };

  const handleChange = (text: string) => {
    let formatted = text;

    if (type === 'number' || type === 'phone') {
      formatted = text.replace(/[^\d]/g, '');
    }

    if (type === 'currency') {
      const numeric = text.replace(/[^\d]/g, '');
      const cents = numeric.padStart(3, '0');
      formatted = `${parseInt(cents.slice(0, -2))}.${cents.slice(-2)}`;
    }

    onTextChange(formatted);
  };

    let isEmailValid = true;
    if (type === 'email') {
    isEmailValid = value === '' || validators.isValidEmail(value);
    }

    let isPhoneValid = true;
    if (type === 'phone') {
    isPhoneValid = value === '' || validators.isValidPhoneNumber(value);
    }

    const isRequiredValid = !required || (touched && validators.isRequired(value));

    const hasError = !isRequiredValid || !isEmailValid || !isPhoneValid;
  return (
    <>
      <TextInput
        {...props}
        keyboardType={type === 'text' ? 'default' : 'numeric'}
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        style={[
          styles.input,
          props.style,
          hasError ? styles.inputError : null,
        ]}
        placeholderTextColor="#9CA3AF"
      />
      {hasError && showErrorMessage? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    borderRadius: 6,
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginTop: 4,
    fontSize: 13,
  },
});

export default ValidatedRequiredTextInput;
