import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
}

const userSchema = new Schema({
  email: { type: String, required: true, unique: true }, // String is shorthand for {type: String}
  password: { type: String, required: true },
  name: String,
});

export const User = mongoose.model<IUser>('User', userSchema);
