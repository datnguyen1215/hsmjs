import { createMachine, assign } from '../src/index.js';

const runExample = async () => {
  const paginationMachine = createMachine({
    id: 'pagination',
    initial: 'idle',
    context: {
      items: [],
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      totalItems: 0,
      loading: false,
      error: null
    },
    states: {
      idle: {
        on: {
          LOAD_PAGE: 'loading',
          REFRESH: {
            target: 'loading',
            actions: [assign({ currentPage: 1, items: [] })]
          }
        }
      },
      loading: {
        entry: [
          assign({ loading: true, error: null }),
          async (ctx, event) => {
            try {
              const page = event?.page || ctx.currentPage;

              // Mock API call
              console.log(`Loading page ${page} with ${ctx.pageSize} items per page...`);
              await new Promise(resolve => setTimeout(resolve, 500));

              // Generate mock data
              const totalItems = 47; // Mock total
              const startIndex = (page - 1) * ctx.pageSize;
              const items = Array.from({ length: Math.min(ctx.pageSize, totalItems - startIndex) },
                (_, i) => ({
                  id: startIndex + i + 1,
                  name: `Item ${startIndex + i + 1}`,
                  description: `This is item number ${startIndex + i + 1}`
                })
              );

              paginationMachine.send('SUCCESS', {
                items,
                totalItems,
                page
              });
            } catch (error) {
              paginationMachine.send('ERROR', { error: error.message });
            }
          }
        ],
        on: {
          SUCCESS: {
            target: 'loaded',
            actions: [assign({
              items: (ctx, event) => event.items,
              currentPage: (ctx, event) => event.page,
              totalItems: (ctx, event) => event.totalItems,
              totalPages: (ctx, event) => Math.ceil(event.totalItems / ctx.pageSize),
              loading: false
            })]
          },
          ERROR: {
            target: 'error',
            actions: [assign({
              error: (ctx, event) => event.error,
              loading: false
            })]
          }
        }
      },
      loaded: {
        on: {
          LOAD_PAGE: [
            {
              target: 'loading',
              cond: (ctx, event) => event.page !== ctx.currentPage &&
                                    event.page > 0 &&
                                    event.page <= ctx.totalPages
            }
          ],
          NEXT_PAGE: [
            {
              target: 'loading',
              cond: (ctx) => ctx.currentPage < ctx.totalPages,
              actions: [assign({ currentPage: (ctx) => ctx.currentPage + 1 })]
            }
          ],
          PREV_PAGE: [
            {
              target: 'loading',
              cond: (ctx) => ctx.currentPage > 1,
              actions: [assign({ currentPage: (ctx) => ctx.currentPage - 1 })]
            }
          ],
          REFRESH: {
            target: 'loading',
            actions: [assign({ items: [] })]
          }
        }
      },
      error: {
        on: {
          RETRY: 'loading',
          REFRESH: {
            target: 'loading',
            actions: [assign({ currentPage: 1, items: [], error: null })]
          }
        }
      }
    }
  });

  // Usage demonstration
  console.log('Paginated Data Loading Example:');
  console.log('Initial state:', paginationMachine.state);

  // Load first page
  console.log('\n1. Loading first page:');
  await paginationMachine.send('LOAD_PAGE');
  console.log('State:', paginationMachine.state);
  console.log('Current page:', paginationMachine.context.currentPage);
  console.log('Total pages:', paginationMachine.context.totalPages);
  console.log('Items on page:', paginationMachine.context.items.length);
  console.log('Sample items:', paginationMachine.context.items.slice(0, 3));

  // Navigate to next page
  console.log('\n2. Going to next page:');
  await paginationMachine.send('NEXT_PAGE');
  console.log('Current page:', paginationMachine.context.currentPage);
  console.log('Items on page:', paginationMachine.context.items.length);
  console.log('Sample items:', paginationMachine.context.items.slice(0, 3));

  // Navigate to specific page
  console.log('\n3. Jump to page 5:');
  await paginationMachine.send('LOAD_PAGE', { page: 5 });
  console.log('Current page:', paginationMachine.context.currentPage);
  console.log('Items on page:', paginationMachine.context.items.length);
  console.log('Sample items:', paginationMachine.context.items.slice(0, 3));

  // Go back one page
  console.log('\n4. Going to previous page:');
  await paginationMachine.send('PREV_PAGE');
  console.log('Current page:', paginationMachine.context.currentPage);
};

runExample().catch(console.error);