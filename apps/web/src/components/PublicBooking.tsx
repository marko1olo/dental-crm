import React, { useState } from 'react';
import './PublicBooking.css';
import { useWebsocket } from '../hooks/useWebsocket';

export const PublicBooking: React.FC = () => {
  const { sendMessage } = useWebsocket('ws://localhost:3000/api/ws'); // Connect to local backend
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [specialty, setSpecialty] = useState('');
  const [doctor, setDoctor] = useState('');
  const [slot, setSlot] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  const specialties = [
    { id: 'therapy', name: 'Лечение кариеса (Терапия)' },
    { id: 'orthopedics', name: 'Установка коронок (Ортопедия)' },
    { id: 'surgery', name: 'Удаление зуба (Хирургия)' },
  ];

  const doctors = [
    { id: 'd1', name: 'Dr. Smith', specialty: 'therapy' },
    { id: 'd2', name: 'Dr. Johnson', specialty: 'orthopedics' },
    { id: 'd3', name: 'Dr. Williams', specialty: 'surgery' },
  ];

  const slots = ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

  const filteredDoctors = doctors.filter(d => d.specialty === specialty);

  const handleBooking = () => {
    // 1. Simulate booking confirmation
    setIsBooked(true);

    // 2. Broadcast via WS to ClinicalScheduler
    sendMessage('NEW_BOOKING_DRAFT', {
      doctorId: doctor,
      specialty,
      time: slot,
      patientName: 'New Web Patient',
      status: 'pending'
    });

    // Note: In a real app we would call a REST endpoint which saves to DB
    // and then the backend broadcasts to admin sockets. Here we mock it by sending from frontend.
  };

  if (isBooked) {
    return (
      <div className="booking-container">
        <div className="booking-card success-card">
          <div className="success-icon">✓</div>
          <h2>Booking Request Sent!</h2>
          <p>Your appointment for <strong>{slot}</strong> is pending confirmation by our administrators.</p>
          <p className="subtext">You will receive an SMS confirmation shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-container">
      <div className="booking-card">
        <h2>Book an Appointment</h2>
        <div className="booking-progress">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`} />
          <div className={`step-line ${step >= 2 ? 'active' : ''}`} />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
          <div className={`step-line ${step >= 3 ? 'active' : ''}`} />
          <div className={`step-dot ${step >= 3 ? 'active' : ''}`} />
        </div>

        {step === 1 && (
          <div className="booking-step">
            <h3>Select Reason for Visit</h3>
            <div className="options-grid">
              {specialties.map(spec => (
                <button 
                  key={spec.id} 
                  className={`option-btn ${specialty === spec.id ? 'selected' : ''}`}
                  onClick={() => setSpecialty(spec.id)}
                >
                  {spec.name}
                </button>
              ))}
            </div>
            <button 
              className="next-btn" 
              disabled={!specialty}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="booking-step">
            <h3>Select a Doctor</h3>
            <div className="options-grid">
              {filteredDoctors.map(doc => (
                <button 
                  key={doc.id} 
                  className={`option-btn ${doctor === doc.id ? 'selected' : ''}`}
                  onClick={() => setDoctor(doc.id)}
                >
                  {doc.name}
                </button>
              ))}
            </div>
            <div className="actions-row">
              <button className="back-btn" onClick={() => setStep(1)}>Back</button>
              <button 
                className="next-btn" 
                disabled={!doctor}
                onClick={() => setStep(3)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="booking-step">
            <h3>Select Time Slot</h3>
            <div className="slots-grid">
              {slots.map(t => (
                <button 
                  key={t} 
                  className={`slot-btn ${slot === t ? 'selected' : ''}`}
                  onClick={() => setSlot(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="actions-row">
              <button className="back-btn" onClick={() => setStep(2)}>Back</button>
              <button 
                className="confirm-btn" 
                disabled={!slot}
                onClick={handleBooking}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
