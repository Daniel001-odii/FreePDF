import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    Text,
    type PressableProps,
    type ViewStyle,
} from 'react-native';

interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const baseClasses =
    'flex-row items-center justify-center rounded-xl active:opacity-70';

  const variantClasses: Record<string, string> = {
    primary: 'bg-blue-600 dark:bg-blue-500',
    secondary: 'bg-gray-200 dark:bg-gray-700',
    outline:
      'border border-blue-600 dark:border-blue-400 bg-transparent',
    ghost: 'bg-transparent',
  };

  const textVariantClasses: Record<string, string> = {
    primary: 'text-white dark:text-white',
    secondary: 'text-gray-900 dark:text-gray-100',
    outline: 'text-blue-600 dark:text-blue-400',
    ghost: 'text-blue-600 dark:text-blue-400',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-2 gap-1.5',
    md: 'px-5 py-3 gap-2',
    lg: 'px-6 py-4 gap-2',
  };

  const textSizes: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <Pressable
      disabled={disabled || loading}
      style={style as ViewStyle}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${(disabled || loading) ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : '#3b82f6'}
        />
      ) : (
        icon
      )}
      <Text
        className={`font-semibold ${textVariantClasses[variant]} ${textSizes[size]}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}