import { Timestamp } from 'firebase/firestore'

export type Profile = {
  id: string
  firstName: string
  lastName: string
  nickName: string
  role: string
  email: string
  points: number
  uid: string
  status: string
}
