import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const fileUploadMachine = createMachine({
    id: 'fileUpload',
    initial: 'idle',
    context: {
      file: null,
      progress: 0,
      uploadedBytes: 0,
      totalBytes: 0,
      result: null,
      error: null,
      abortController: null
    },
    states: {
      idle: {
        on: {
          SELECT_FILE: {
            target: 'selected',
            actions: [assign({
              file: (ctx, event) => event.file,
              totalBytes: (ctx, event) => event.file.size,
              progress: 0,
              uploadedBytes: 0,
              result: null,
              error: null
            })]
          }
        }
      },
      selected: {
        on: {
          UPLOAD: 'uploading',
          SELECT_FILE: {
            actions: [assign({
              file: (ctx, event) => event.file,
              totalBytes: (ctx, event) => event.file.size,
              progress: 0,
              uploadedBytes: 0,
              result: null,
              error: null
            })]
          },
          CLEAR: {
            target: 'idle',
            actions: [assign({
              file: null,
              totalBytes: 0,
              progress: 0,
              uploadedBytes: 0,
              result: null,
              error: null
            })]
          }
        }
      },
      uploading: {
        entry: [
          assign({
            abortController: () => ({ abort: () => console.log('Upload aborted') }) // Mock for Node.js
          }),
          async (ctx) => {
            try {
              console.log('Starting upload...');
              console.log('File:', ctx.file.name, 'Size:', ctx.file.size, 'bytes');

              // Simulate upload progress
              const totalSteps = 10;
              for (let i = 1; i <= totalSteps; i++) {
                await new Promise(resolve => setTimeout(resolve, 200));
                const progress = Math.round((i / totalSteps) * 100);
                const uploadedBytes = Math.round((ctx.file.size * i) / totalSteps);

                fileUploadMachine.send('PROGRESS', {
                  progress,
                  uploadedBytes
                });
              }

              const result = {
                url: 'https://example.com/uploads/' + ctx.file.name,
                id: Date.now()
              };
              fileUploadMachine.send('SUCCESS', { result });
            } catch (error) {
              fileUploadMachine.send('ERROR', { error: error.message });
            }
          }
        ],
        on: {
          PROGRESS: {
            actions: [assign({
              progress: (ctx, event) => event.progress,
              uploadedBytes: (ctx, event) => event.uploadedBytes
            })]
          },
          SUCCESS: {
            target: 'completed',
            actions: [assign({
              result: (ctx, event) => event.result,
              progress: 100
            })]
          },
          ERROR: {
            target: 'error',
            actions: [assign({
              error: (ctx, event) => event.error
            })]
          },
          CANCEL: {
            target: 'selected',
            actions: [
              (ctx) => {
                if (ctx.abortController) {
                  ctx.abortController.abort();
                }
              },
              assign({
                progress: 0,
                uploadedBytes: 0,
                abortController: null
              })
            ]
          }
        }
      },
      completed: {
        on: {
          UPLOAD_ANOTHER: 'idle',
          CLEAR: {
            target: 'idle',
            actions: [assign({
              file: null,
              progress: 0,
              uploadedBytes: 0,
              totalBytes: 0,
              result: null
            })]
          }
        }
      },
      error: {
        on: {
          RETRY: 'uploading',
          SELECT_FILE: {
            target: 'selected',
            actions: [assign({
              file: (ctx, event) => event.file,
              totalBytes: (ctx, event) => event.file.size,
              progress: 0,
              uploadedBytes: 0,
              error: null
            })]
          },
          CLEAR: {
            target: 'idle',
            actions: [assign({
              file: null,
              progress: 0,
              uploadedBytes: 0,
              totalBytes: 0,
              error: null
            })]
          }
        }
      }
    }
  });

  // Mock file object for demonstration
  const mockFile = {
    name: 'document.pdf',
    size: 2048000, // 2MB
    type: 'application/pdf'
  };

  // Usage demonstration
  console.log('File Upload Example:');
  console.log('Initial state:', fileUploadMachine.state);

  await fileUploadMachine.send('SELECT_FILE', { file: mockFile });
  console.log('After file selection:', fileUploadMachine.state);
  console.log('Selected file:', fileUploadMachine.context.file.name);
  console.log('File size:', fileUploadMachine.context.totalBytes, 'bytes');

  // Start upload with progress tracking
  const progressCallback = () => {
    if (fileUploadMachine.context.progress > 0) {
      console.log(`Upload progress: ${fileUploadMachine.context.progress}% (${fileUploadMachine.context.uploadedBytes}/${fileUploadMachine.context.totalBytes} bytes)`);
    }
  };

  // Subscribe to state changes to show progress
  fileUploadMachine.subscribe(progressCallback);

  await fileUploadMachine.send('UPLOAD');

  // Wait for upload to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Final state:', fileUploadMachine.state);
  console.log('Upload result:', fileUploadMachine.context.result);
};

runExample().catch(console.error);