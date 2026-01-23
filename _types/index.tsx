// Make sure your Profile type in @/_types includes at minimum:

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  uid: string;
  status?: string; // 'Active' | 'Disabled'
  createdAt?: any;
  // Add any other fields your profile documents have
}

// Your Firestore profile document should look like this:
// profile/{userUID}
// {
//   firstName: "John",
//   lastName: "Doe", 
//   email: "john@example.com",
//   uid: "same-as-document-id",
//   status: "Active",
//   createdAt: timestamp
// }