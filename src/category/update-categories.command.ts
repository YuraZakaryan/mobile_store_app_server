import { Command, CommandRunner } from 'nest-commander';
import { CategoryService } from './category.service';

@Command({
  name: 'update-categories',
  description: 'Update categories to include orderIndex',
})
export class UpdateCategoriesCommand extends CommandRunner {
  constructor(private readonly categoryService: CategoryService) {
    super();
  }

  async run(): Promise<void> {
    await this.categoryService.updateCategoriesWithOrderIndex();
    console.log('Categories updated successfully.');
  }
}
