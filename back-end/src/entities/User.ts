// User entity
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Follow } from "./Follow";
import { Message } from "./Message";
import { Post } from "./Post";

@Entity("User")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: number;

  @Column()
  username!: string;

  @Column()
  email!: string;

  @Column({ nullable: false })
  password!: string;

  @OneToMany(() => Post, (post) => post.user)
  posts!: Post[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages!: Message[];

  @OneToMany(() => Message, (message) => message.receiver)
  receivedMessages!: Message[];

  @OneToMany(() => Follow, (follow) => follow.follower)
  following!: Follow[];
}
