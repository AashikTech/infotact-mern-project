export function clean(doc: any) {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  delete obj.password;
  return obj;
}

export function cleanMany(docs: any[]) {
  return docs.map((doc) => clean(doc));
}
