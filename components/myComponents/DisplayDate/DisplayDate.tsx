import React from 'react';

const DateDisplay = ({ date }) => {
  if (!date) return null; // Handle cases where no date is provided
  return (
    <p>{date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</p>
  );
};

export default DateDisplay;