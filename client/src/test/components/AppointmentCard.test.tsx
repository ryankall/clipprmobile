import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentCard } from '@/components/appointment-card';
import type { AppointmentWithRelations } from '@shared/schema';

const mockAppointment: AppointmentWithRelations = {
  id: 1,
  userId: 1,
  clientId: 1,
  serviceId: 1,
  scheduledAt: new Date('2025-07-03T14:00:00Z'),
  status: 'confirmed',
  notes: 'Regular appointment',
  address: '123 Main St',
  price: '35.00',
  duration: 45,
  reminderSent: false,
  createdAt: new Date('2025-07-01'),
  client: {
    id: 1,
    userId: 1,
    name: 'John Doe',
    phone: '(555) 123-4567',
    email: 'john@example.com',
    address: '123 Main St',
    photoUrl: null,
    preferredStyle: 'Fade cut',
    notes: 'Regular customer',
    loyaltyStatus: 'gold',
    lastVisit: new Date('2025-07-01'),
    totalVisits: 10,
    createdAt: new Date('2024-01-01'),
  },
  service: {
    id: 1,
    userId: 1,
    name: 'Haircut',
    description: 'Classic haircut',
    price: '35.00',
    duration: 45,
    category: 'Haircuts',
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
  appointmentServices: [],
};

describe('AppointmentCard', () => {
  it('renders appointment information correctly', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Haircut')).toBeInTheDocument();
    expect(screen.getByText('$35.00')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('calls onClick when clicked and showClickable is true', () => {
    const mockOnClick = vi.fn();
    render(
      <AppointmentCard 
        appointment={mockAppointment} 
        onClick={mockOnClick}
        showClickable={true}
      />
    );
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(mockOnClick).toHaveBeenCalledWith(mockAppointment);
  });

  it('does not call onClick when showClickable is false', () => {
    const mockOnClick = vi.fn();
    render(
      <AppointmentCard 
        appointment={mockAppointment} 
        onClick={mockOnClick}
        showClickable={false}
      />
    );
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('displays status badge correctly', () => {
    render(<AppointmentCard appointment={{ ...mockAppointment, status: 'pending' }} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows address when provided', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    // Check for formatted time (exact format may vary based on locale)
    expect(screen.getByText(/2:00 PM/)).toBeInTheDocument();
  });
});