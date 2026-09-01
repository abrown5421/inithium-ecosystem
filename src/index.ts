import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { removeCommand } from './commands/remove.js';

const program = new Command();

program
  .name('inithium')
  .description('A la carte full-stack monorepo scaffolding CLI')
  .version('0.1.0');

program
  .command('init <project-name>')
  .description('Scaffold a new Inithium Core Nx monorepo project')
  .option('-d, --dev', 'Use local templates directory for testing')
  .option('--skip-install', 'Skip running package manager install')
  .action(initCommand);

program
  .command('add <plugin-name>')
  .description('Eject and inject an Inithium plugin into the current workspace')
  .option('-d, --dev', 'Use local plugins directory for testing')
  .option('--skip-install', 'Skip running package manager install')
  .action(addCommand);

program
  .command('remove <plugin-name>')
  .description('Eject and remove an Inithium plugin from the current workspace')
  .option('-d, --dev', 'Use local plugins directory for testing')
  .option('--skip-install', 'Skip running package manager install')
  .option('--force', 'Remove even if other installed plugins depend on this plugin')
  .action(removeCommand);

program.parse(process.argv);