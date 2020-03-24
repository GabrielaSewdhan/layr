export function isStorableClass(object) {
  return typeof object?.isStorable === 'function';
}

export function isStorableInstance(object) {
  return isStorableClass(object?.constructor);
}

export function isStorable(object) {
  return isStorableInstance(object);
}