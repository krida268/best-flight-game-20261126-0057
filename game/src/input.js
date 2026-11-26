// Keyboard and mouse input for Sky Courier: Island Run.
// Tracks held keys and the pointer so the plane answers at every speed.

export function createInput(canvas) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, active: false, down: false };

  const onKeyDown = (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
  };
  const onKeyUp = (event) => keys.delete(event.code);
  const onBlur = () => keys.clear();

  const updatePointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    pointer.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  };
  const onPointerMove = (event) => {
    updatePointer(event);
    pointer.active = true;
  };
  const onPointerDown = (event) => {
    updatePointer(event);
    pointer.active = true;
    pointer.down = true;
  };
  const onPointerUp = () => {
    pointer.down = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  return {
    keys,
    pointer,
    // -1, 0 or 1 for a pair of keys.
    axis(neg, pos) {
      return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
    },
    pressed(code) {
      return keys.has(code);
    },
    // Consume a key press once (for menu choices and restarts).
    consume(code) {
      if (keys.has(code)) {
        keys.delete(code);
        return true;
      }
      return false;
    },
  };
}
