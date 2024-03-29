// Post entity
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Comment } from "./Comment";
import { Like } from "./Like";
import { User } from "./User";

@Entity("Post")
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  content!: string;

  @ManyToOne(() => User, (user) => user.posts)
  user!: User;

  @OneToMany(() => Like, (like) => like.post)
  likes!: Like[];

  @OneToMany(() => Comment, (comment) => comment.post)
  comments!: Comment[];
}
