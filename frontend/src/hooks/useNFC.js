import { useState, useEffect } from 'react';

export const useNFC = () => {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState(null);
  const [ndefReader, setNdefReader] = useState(null);

  useEffect(() => {
    // Check if Web NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
      const reader = new window.NDEFReader();
      setNdefReader(reader);
    } else {
      setNfcSupported(false);
    }
  }, []);

  const startReading = async (onTicketScanned) => {
    if (!ndefReader) {
      setError('NFC not supported on this device');
      return;
    }

    try {
      setReading(true);
      setError(null);

      await ndefReader.scan();
      console.log('✅ NFC scan started');

      ndefReader.addEventListener('reading', ({ message, serialNumber }) => {
        console.log(`NFC tag detected: ${serialNumber}`);
        
        // Parse NDEF message
        for (const record of message.records) {
          const textDecoder = new TextDecoder(record.encoding);
          const recordData = textDecoder.decode(record.data);
          
          // Check if it's a ticket ID
          if (record.recordType === 'text' || record.recordType === 'url') {
            console.log('Ticket data:', recordData);
            
            // Extract ticket number (format: TICKET-XXXXX or URL with ticket ID)
            const ticketMatch = recordData.match(/TICKET-(\w+)|ticket[=/](\w+)/i);
            if (ticketMatch) {
              const ticketId = ticketMatch[1] || ticketMatch[2];
              onTicketScanned(ticketId);
            } else {
              onTicketScanned(recordData);
            }
          }
        }
      });

      ndefReader.addEventListener('readingerror', () => {
        setError('Failed to read NFC tag. Please try again.');
      });

    } catch (error) {
      console.error('NFC Error:', error);
      setError(error.message || 'Failed to start NFC reading');
      setReading(false);
    }
  };

  const stopReading = () => {
    if (ndefReader) {
      setReading(false);
      // Web NFC API doesn't have a stop method, but we can remove listeners
      console.log('NFC reading stopped');
    }
  };

  const writeTicket = async (ticketNumber) => {
    if (!ndefReader) {
      throw new Error('NFC not supported');
    }

    try {
      await ndefReader.write({
        records: [
          {
            recordType: 'text',
            data: `TICKET-${ticketNumber}`
          },
          {
            recordType: 'url',
            data: `${window.location.origin}/ticket/${ticketNumber}`
          }
        ]
      });
      console.log('✅ Ticket written to NFC tag');
      return true;
    } catch (error) {
      console.error('Failed to write NFC:', error);
      throw error;
    }
  };

  return {
    nfcSupported,
    reading,
    error,
    startReading,
    stopReading,
    writeTicket
  };
};

export default useNFC;
