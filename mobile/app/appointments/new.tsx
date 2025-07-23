import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function NewAppointment() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    // Placeholder: In a real app, submit to backend here
    Alert.alert("Appointment Created", `Title: ${title}\nDate: ${date}`);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create Appointment</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <Button title="Create" onPress={handleSubmit} disabled={!title || !date} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
});