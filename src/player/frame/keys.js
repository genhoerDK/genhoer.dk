/**
 * Whether a key press in a player should be left alone: someone is typing in a field, or the key
 * is space / enter on a focused button or link, which presses that itself.
 */
export function keyIsTaken(e) {
    const target = e.target;
    if (!target?.closest) return false;
    if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
    if ((e.key === ' ' || e.key === 'Enter') && target.closest('button, a, [role="button"]')) return true;
    return false;
}
