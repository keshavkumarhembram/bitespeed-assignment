
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function identifyContact(email?: string, phoneNumber?: string) {
  if (!email && !phoneNumber) {
    throw new Error('At least one of email or phoneNumber must be provided');
  }

    // Step 1: Find all matching contacts by email or phone
    const matchedContacts = await prisma.contact.findMany({
        where: {
        OR: [
            ...(email ? [{ email }] : []),
            ...(phoneNumber ? [{ phoneNumber }] : [])
        ]
        },
        orderBy: {
        createdAt: 'asc'
        }
    });

    // If no contacts found, create a new primary contact
    if (matchedContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'PRIMARY'
        }
      });

       return  {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: []
        }
      }


// -------------------------------------------------------------------------------------------
// Step 2: Determine all related contacts
  let allRelatedContacts = [...matchedContacts];
  const primaryContactIds = new Set<number>();

  for (const contact of matchedContacts) {
    if (contact.linkPrecedence === 'SECONDARY' && contact.linkedId) {
      primaryContactIds.add(contact.linkedId);
    } else {
      primaryContactIds.add(contact.id);
    }
  }

  if (primaryContactIds.size > 0) {
    const truePrimary = Math.min(...primaryContactIds);
    for (const id of primaryContactIds) {
        if(id != truePrimary){
            await prisma.contact.update({
          where: { id: id },
          data: {
            linkPrecedence: 'SECONDARY',
            linkedId: truePrimary,
          }
        });
        }
        
      }
    const allLinkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: truePrimary },
          { linkedId: truePrimary }
        ]
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    allRelatedContacts = allLinkedContacts;
    // Step 3: Merge if multiple primaries exist
    const uniquePrimaries = allLinkedContacts.filter((c: { linkPrecedence: string; }) => c.linkPrecedence === 'PRIMARY');
    if (uniquePrimaries.length > 1) {
      const truePrimary = uniquePrimaries[0];
      const othersToUpdate = uniquePrimaries.slice(1);

      for (const contact of othersToUpdate) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: 'SECONDARY',
            linkedId: truePrimary.id,
          }
        });
      }

      allRelatedContacts = await prisma.contact.findMany({
        where: {
          OR: [
            { id: truePrimary.id },
            { linkedId: truePrimary.id }
          ]
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }
  }

  // Step 4: Check if a new secondary contact is needed
  const emails = allRelatedContacts.map(c => c.email).filter(Boolean);
  const phones = allRelatedContacts.map(c => c.phoneNumber).filter(Boolean);
  const emailAlreadyExists = allRelatedContacts.some(c =>
    (email && c.email === email));
   const phoneAlreadyExists = allRelatedContacts.some(c =>(phoneNumber && c.phoneNumber === phoneNumber));

  let primaryContact = allRelatedContacts.find(c => c.linkPrecedence === 'PRIMARY');
  if (!primaryContact) {
    primaryContact = allRelatedContacts[0];
  }

  if (!emailAlreadyExists && email != null) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'SECONDARY',
        linkedId: primaryContact.id,
      },
    });
    allRelatedContacts.push(newContact);
  }
  if (!phoneAlreadyExists && phoneNumber != null) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'SECONDARY',
        linkedId: primaryContact.id,
      },
    });
    allRelatedContacts.push(newContact);
  }

  // Step 5: Build the response
  const uniqueEmails = Array.from(new Set(allRelatedContacts.map(c => c.email).filter(Boolean))) as string[];
  const uniquePhones = Array.from(new Set(allRelatedContacts.map(c => c.phoneNumber).filter(Boolean))) as string[];
  const secondaryIds = allRelatedContacts
    .filter(c => c.linkPrecedence === 'SECONDARY')
    .map(c => c.id);

  return {
    primaryContatctId: primaryContact.id,
    emails: [primaryContact.email, ...uniqueEmails.filter(e => e !== primaryContact.email)],
    phoneNumbers: [primaryContact.phoneNumber, ...uniquePhones.filter(p => p !== primaryContact.phoneNumber)],
    secondaryContactIds: secondaryIds,
  };
}
