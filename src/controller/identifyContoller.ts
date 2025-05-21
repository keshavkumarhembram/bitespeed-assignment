import { indentifyContact } from "../utils/identifyContact";

export async function identifyContacts(req:any, res:any) {
  const { email, phoneNumber } = req.body;
  try {
    const contact = await indentifyContact(email, phoneNumber);
    res.json({ contact });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
}
}
