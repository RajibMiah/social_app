// Comment entity
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@Entity("Comment")
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id!: number;

  @Column()
  content!: string;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Post)
  post!: Post;
}
