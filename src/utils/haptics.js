export function hapticLight() {
  if (navigator.vibrate) navigator.vibrate(10);
}

export function hapticMedium() {
  if (navigator.vibrate) navigator.vibrate(20);
}

export function hapticHeavy() {
  if (navigator.vibrate) navigator.vibrate(40);
}
