// Conversation entity (assuming it represents a conversation between two users)
import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Message } from "./Message";
import { User } from "./User";

@Entity("Conversation")
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id!: number;

  @ManyToOne(() => User)
  user1!: User;

  @ManyToOne(() => User)
  user2!: User;

  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[];
}
