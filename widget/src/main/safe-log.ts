import { writeLog } from './file-logger';

type LogMethod = 'log' | 'error' | 'warn' | 'info';

let loggingGuardsInstalled = false;

export function isBrokenPipeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'EPIPE' ||
    code === 'ERR_STREAM_WRITE_AFTER_END' ||
    code === 'ERR_STREAM_DESTROYED' ||
    (typeof message === 'string' && (
      message.includes('EPIPE') ||
      message.includes('broken pipe') ||
      message.includes('write after end') ||
      message.includes('stream was destroyed')
    ))
  );
}

export function installLoggingGuards(): void {
  if (loggingGuardsInstalled) {
    return;
  }

  loggingGuardsInstalled = true;

  for (const stream of [process.stdout, process.stderr]) {
    stream.on('error', (error) => {
      if (isBrokenPipeError(error)) {
        return;
      }

      throw error;
    });
  }
}

export function safeWrite(
  stream: NodeJS.WriteStream,
  chunk: string | Uint8Array,
  encoding?: BufferEncoding,
): boolean {
  installLoggingGuards();

  if (stream.destroyed || stream.writableEnded) {
    return false;
  }

  try {
    return encoding
      ? stream.write(chunk, encoding)
      : stream.write(chunk);
  } catch (error) {
    if (!isBrokenPipeError(error)) {
      throw error;
    }

    return false;
  }
}

export function safeLog(method: LogMethod, ...args: unknown[]): void {
  installLoggingGuards();

  writeLog(method, ...args);

  try {
    console[method](...args);
  } catch (error) {
    if (!isBrokenPipeError(error)) {
      throw error;
    }
  }
}
