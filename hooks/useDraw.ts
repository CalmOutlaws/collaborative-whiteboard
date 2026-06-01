// hooks/useDraw.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export const useDraw = (onDraw: ({ ctx, currentPoint, prevPoint }: any) => void) => {
  const [mouseDown, setMouseDown] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevPoint = useRef<null | { x: number; y: number }>(null);
  const isDrawing = useRef(false);

  const onMouseDown = useCallback(() => {
    setMouseDown(true);
    isDrawing.current = true;
  }, []);

  useEffect(() => {
    const computePointInCanvas = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y };
    };

    const handler = (e: MouseEvent) => {
      if (!mouseDown) return;
      const currentPoint = computePointInCanvas(e);

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !currentPoint) return;

      onDraw({ ctx, currentPoint, prevPoint: prevPoint.current });
      prevPoint.current = currentPoint;
    };

    const mouseUpHandler = () => {
      setMouseDown(false);
      isDrawing.current = false;
      prevPoint.current = null;
    };

    window.addEventListener('mousemove', handler);
    window.addEventListener('mouseup', mouseUpHandler);
    window.addEventListener('mouseleave', mouseUpHandler);

    return () => {
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('mouseup', mouseUpHandler);
      window.removeEventListener('mouseleave', mouseUpHandler);
    };
  }, [onDraw, mouseDown]);

  // Additional touch support
  useEffect(() => {
    const touchHandler = (e: TouchEvent) => {
      if (!mouseDown) return;
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const currentPoint = { x, y };

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !currentPoint) return;

      onDraw({ ctx, currentPoint, prevPoint: prevPoint.current });
      prevPoint.current = currentPoint;
    };

    const touchEndHandler = () => {
      setMouseDown(false);
      isDrawing.current = false;
      prevPoint.current = null;
    };

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        setMouseDown(true);
        isDrawing.current = true;
        const touch = e.touches[0];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        prevPoint.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        };
      }
    });

    window.addEventListener('touchmove', touchHandler, { passive: false });
    window.addEventListener('touchend', touchEndHandler);
    window.addEventListener('touchcancel', touchEndHandler);

    return () => {
      window.removeEventListener('touchstart', () => {});
      window.removeEventListener('touchmove', touchHandler);
      window.removeEventListener('touchend', touchEndHandler);
      window.removeEventListener('touchcancel', touchEndHandler);
    };
  }, [mouseDown, onDraw]);

  return { canvasRef, onMouseDown, isDrawing: () => isDrawing.current };
};