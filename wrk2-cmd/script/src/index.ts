import { Argv, Wrk2Cmd } from './wrk2cmd';

// Parse arguments.
const argv = new Argv(process.argv);

// Run command.
const cmd = new Wrk2Cmd(argv);
cmd.run().catch((error: Error) => {
    console.error(error);
});
