export async function identifyContacts(req:any, res:any) {
  const { email, phoneNumber } = req.body;
  res.status(200).json({status: 'success', email, phoneNumber})
}
