import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Conversation } from "../entity/Conversation";
import { User } from "./User";

@Entity("Message")
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  content!: string;

  @ManyToOne(() => User, (user) => user.sentMessages)
  sender!: User;

  @ManyToOne(() => User, (user) => user.receivedMessages)
  receiver!: User;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  conversation!: Conversation;
}
