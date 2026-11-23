/**
 * Whether a key press in a player should be left alone: the player is closed (the keys belong to
 * the page: space scrolls it), someone is typing in a field, or the key is space / enter on a
 * focused button or link, which presses that itself.
 */
export function keyIsTaken(e) {
    if (!new URLSearchParams(window.location.search).has('lyt')) return true;   // the player is closed (Player.js)
    const target = e.target;
    if (!target?.closest) return false;
    if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return true;
    if ((e.key === ' ' || e.key === 'Enter') && target.closest('button, a, [role="button"]')) return true;
    return false;
}
