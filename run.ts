import { IExecutor } from './Executor';
import ITask from './Task';


//Если не сложно, прошу развернутый фидбек по данному заданию))). Спасибо за уделенное время.




export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
    maxThreads = Math.max(0, maxThreads);
    // let a = [...queue]
    let running: number[] = []; 
    let inOrder: ITask[] = []; 
    let threads: any[] = []; 

    const executeOrder = async () => {
        await Promise.all(threads);
        running.length = 0; 
        threads.length = 0;           
    }
    
    const checkInOrderZeroThreads =  async () => { 
        if (inOrder.length > 0) { 
            for (let task of inOrder) { 
                if (!running.includes(task.targetId)) { 
                    running.push(task.targetId);  
                    threads.push(executor.executeTask(task)); 
                    let i = inOrder.indexOf(task); 
                    inOrder = [...inOrder.slice(0, i), ...inOrder.slice(i+1)]; 
                }
            }
            await executeOrder();
            await checkInOrderZeroThreads();
            
       } 
    };

    const checkInOrder = async () => {
                
        if (inOrder.length > 0) { 
            for (let task of inOrder) { 
                if(running.length === maxThreads) { 
                    await executeOrder();
                    await checkInOrder(); 
                }

                if (!running.includes(task.targetId)) {                     
                    running.push(task.targetId); 
                    threads.push(executor.executeTask(task)); 
                    let i = inOrder.indexOf(task); 
                    inOrder = [...inOrder.slice(0, i), ...inOrder.slice(i+1)];              
                }

            }
            
       }
       
    };

    const limited = async () => {
        
        for await (let task of queue) { 
            if (running.length < maxThreads) { 
                checkInOrder();
                if (!running.includes(task.targetId)) { 
                    running.push(task.targetId); 
                    threads.push(executor.executeTask(task)); 
                    if(running.length === maxThreads) { 
                        await executeOrder();
                    } 
                } else {
                    inOrder.push(task); 
                }                
            }
        }

        await checkInOrderZeroThreads();        
    
    };

    const unlimited = async () => {

        for await (let task of queue) { 

            if (!running.includes(task.targetId)) {
                running.push(task.targetId); 
                threads.push(executor.executeTask(task));        
            } else {
             inOrder.push(task); 
            } 
        }
        await executeOrder();

        await checkInOrderZeroThreads(); 
    } 
    
    if (maxThreads > 0) {
        await limited();
        await limited();
    } else { 
        await unlimited();
    }
        
}