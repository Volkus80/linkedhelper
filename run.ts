import { IExecutor } from './Executor';
import ITask from './Task';


//Если не сложно, прошу развернутый фидбек по данному заданию))). Спасибо за уделенное время.




export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
    maxThreads = Math.max(0, maxThreads);
    let running: number[] = []; //регистрация задач в работе
    let inOrder: ITask[] = []; //постановка в очередь задач, id которых уже используется
    let threads: any[] = []; //набор задач для исполнения
    const isFitForThreads = () => { 
        const listOfId: number[] = [];
        for (let task of inOrder) {
            if(!listOfId.includes(task.targetId)) {
                listOfId.push(task.targetId);
            }
        }
        return listOfId.length;
    };
    const correctThread = () => {
        let threadsValue = maxThreads;
        let availableThread = isFitForThreads();                    
        if(availableThread < threadsValue) {
            availableThread > running.length ? threadsValue = availableThread : threadsValue = running.length;
        }
        return threadsValue;
    };    
    const checkInOrderZeroThreads =  async () => { //обработка задач из очереди отложенных с неограниченным потоком
        if (inOrder.length > 0) { //проверяем, есть ли задачи в очереди
            for (let task of inOrder) { //перебираем задачи в очереди
                if (!running.includes(task.targetId)) { //проверяем выполняется ли в данный момент задача с подобным id
                    running.push(task.targetId);  //регистриуем id задачи как исполняемую
                    threads.push(executor.executeTask(task)); //добавляем задачу к исполнению
                    let i = inOrder.indexOf(task); //определяем нахождение задачи в очереди
                    inOrder = [...inOrder.slice(0, i), ...inOrder.slice(i+1)]; //удаляем задачу из очереди
                }
            }
            await Promise.all(threads).then(() => { //ожидаем исполнения всех задач потока
                running.length = 0; //очищаем список исполняемых задач
                threads.length = 0; //очищаем выполненые задачи
            });
            await checkInOrderZeroThreads();
            
       } 
       return;
    };

    const checkInOrder = async (threadsValue: number) => { //обработка задач из очереди отложенных с ограниченным потоком
                
        if (inOrder.length > 0) { //проверяем, есть ли задачи в очереди
            for (let task of inOrder) { //перебираем задачи в очереди
                if(running.length >= threadsValue) { // проверяем достиг ли поток максимального значения 
                    await Promise.all(threads).then(() => { //ожидаем исполнения всех задач потока
                        running.length = 0; //очищаем список исполняемых задач
                        threads.length = 0; //очищаем выполненые задачи
                    })
                    await checkInOrder(threadsValue); //повторно запускаем обработку отложенных задач
                }

                if (!running.includes(task.targetId)) { //проверяем выполняется ли в данный момент задача с подобным id                    
                    running.push(task.targetId); //регистриуем id задачи как исполняемую
                    threads.push(executor.executeTask(task)); //добавляем задачу к исполнению
                    let i = inOrder.indexOf(task); //определяем нахождение задачи в очереди
                    inOrder = [...inOrder.slice(0, i), ...inOrder.slice(i+1)]; //удаляем задачу из очереди                  
                }

            }
            
       }
       
    };

    const limited = async () => {
        let initialThread = maxThreads;

        for await (let task of queue) { //начинаем перебор очереди задач
            if (running.length < initialThread) { //сравниваем количество задач в работе с размером "потока"
                checkInOrder(initialThread); //выполняем отложенные задачи
                if (!running.includes(task.targetId)) { //проверяем выполняется ли в данный момент задача с подобным id
                    running.push(task.targetId); //регистриуем id задачи как исполняемую
                    threads.push(executor.executeTask(task)); //добавляем задачу к исполнению
                    if(running.length === initialThread) { // проверяем достиг ли поток максимального значения
                        await Promise.all(threads).then(() => { //ожидаем исполнения всех задач потока
                            running.length = 0; //очищаем список исполняемых задач
                            threads.length = 0; //очищаем выполненые задачи
                        })
                    } 
                } else {
                    inOrder.push(task); //добавляем задачу в очередь
                }                
            }
        }

        await Promise.all(threads).then(() => { //ожидаем исполнения всех задач потока
            running.length = 0; //очищаем список исполняемых задач
            threads.length = 0;  //очищаем выполненые задачи             
        });

        while (inOrder.length > 0) { //проверяем наличие задач в очереди
            const threadsValue = correctThread(); //макс. кол-во задач которые возможно одновременно обработать
            await checkInOrder(threadsValue); //обрабатываем очередь 
        }

        await Promise.all(threads).then(() => { //ожидаем исполнения всех задач потока
            running.length = 0; //очищаем список исполняемых задач
            threads.length = 0;  //очищаем выполненые задачи             
        })
        
    
    };

    const unlimited = async () => {

        for await (let task of queue) { //перебираем задачи

            if (!running.includes(task.targetId)) {//проверяем выполняется ли в данный момент задача с подобным id
                running.push(task.targetId); //регистриуем id задачи как исполняемую
                threads.push(executor.executeTask(task)); //добавляем задачу к исполнению         
            } else {
             inOrder.push(task); //добавляем задачу в очередь на последущее исполнение
            } 
        }
        await Promise.all(threads).then(() => { //ожидаем исполнения всех задач потока
            running.length = 0; //очищаем список исполняемых задач
            threads.length = 0;  //очищаем выполненые задачи             
        });

        await checkInOrderZeroThreads(); //обрабатываем задачи в очереди        

    } 
    
    if (maxThreads > 0) { //при условии что количество потоков >  0
        await limited();
        await limited();
    } else { //при нулевом значении потоков
        await unlimited();
    }
        
}
