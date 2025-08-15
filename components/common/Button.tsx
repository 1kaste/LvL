
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', icon, ...props }) => {
  const baseStyles = 'px-4 py-2 rounded-lg font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary-orange-600 text-white hover:bg-primary-orange-700 focus:ring-primary-orange-500',
    secondary: 'bg-primary-cyan-700 text-white hover:bg-primary-cyan-800 focus:ring-primary-cyan-600 dark:bg-dark-mode-blue-700 dark:hover:bg-dark-mode-blue-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;