import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const Resizer = React.memo(({ height, setHeight, isDarkMode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY;
    let newHeight = parseFloat(height) + deltaY;

    // min & max
    newHeight = Math.max(newHeight, 60);
    newHeight = Math.min(newHeight, window.innerHeight - 150);

    setHeight(`${newHeight}px`);
    setStartY(e.clientY);
  }, [isDragging, startY, height, setHeight]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  return (
    <div
      className={`resizer ${isDragging ? 'dragging' : ''} ${isDarkMode ? 'dark-mode' : ''}`}
      onMouseDown={onMouseDown}
      aria-label="Resize input field"
    />
  );
});

Resizer.propTypes = {
  height: PropTypes.string.isRequired,
  setHeight: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
};

export default Resizer;