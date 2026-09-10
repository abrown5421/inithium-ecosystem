import { BlogRepository } from '../../contracts/blog.contract';
import { createMongoBlogPostRepository } from './blog-post.repository';
import { BlogPostModel } from '../../schemas/blog-post.schema';
// inithium:anchor:imports
const blogRepository = createMongoBlogPostRepository(BlogPostModel);
// inithium:anchor:repository-instances
  getBlogRepository: (): BlogRepository => blogRepository,
  // inithium:anchor:members
