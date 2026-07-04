export function clean(doc: any) {
  const obj = doc.toObject({ virtuals: false });
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  delete obj.password;
  if (obj.senderId && typeof obj.senderId === 'object' && obj.senderId._id) {
    obj.senderId.id = obj.senderId._id.toString();
    delete obj.senderId._id;
  }
  return obj;
}

export function cleanMany(docs: any[]) {
  return docs.map((doc) => clean(doc));
}
