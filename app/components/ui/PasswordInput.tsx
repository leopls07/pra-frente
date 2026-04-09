import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & { label: string };

export function PasswordInput({ label, style, ...props }: Readonly<PasswordInputProps>) {
  const [visivel, setVisivel] = useState(false);

  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!visivel}
          {...props}
        />
        <TouchableOpacity
          style={styles.icone}
          onPress={() => setVisivel((v) => !v)}
          activeOpacity={0.7}
          accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={visivel ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 6 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.label },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingRight: 52,
    fontSize: 16,
    color: Colors.text,
    minHeight: 52,
  },
  icone: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
  },
});
