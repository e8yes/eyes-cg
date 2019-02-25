#ifndef THREAD_H_INCLUDED
#define THREAD_H_INCLUDED

#include <vector>
#include <queue>
#include <map>
#include <pthread.h>
#include <semaphore.h>

namespace e8util
{

typedef pthread_mutex_t         mutex_t;
typedef unsigned int            tid_t;


class if_task_storage
{
public:
        if_task_storage();
        virtual ~if_task_storage();
};


class if_task
{
public:
        if_task(bool drop_on_completion = true);
        virtual ~if_task();

        virtual void    run(if_task_storage* storage) = 0;

        bool            is_drop_on_completion() const;
        void            assign_worker_id(int worker_id);
        int             worker_id() const;
private:
        int     m_worker_id;
        bool    m_drop_on_completion;
};

class task_info
{
        friend task_info        run(if_task* task, if_task_storage* task_data);
        friend void             sync(task_info& info);

        friend void*            thread_pool_worker(void* p);
public:
        task_info(tid_t tid, pthread_t thread, if_task* task);
        task_info();

        if_task*        task() const;
private:
        tid_t           m_tid;
        pthread_t       m_thread;
        if_task*        m_task;
};


class thread_pool
{
        friend void*    thread_pool_worker(void* p);
public:
        thread_pool(unsigned num_thrs,
                    std::vector<if_task_storage*> worker_storage = std::vector<if_task_storage*>());
        ~thread_pool();

        task_info               run(if_task* task);
        task_info               retrieve_next_completed();
private:
        sem_t                           m_enter_sem;
        pthread_mutex_t                 m_enter_mutex;
        sem_t                           m_exit_sem;
        pthread_mutex_t                 m_exit_mutex;
        pthread_mutex_t                 m_work_group_mutex;
        pthread_t*                      m_workers;
        std::vector<if_task_storage*>   m_worker_storage;
        unsigned                        m_num_thrs;
        std::queue<task_info>           m_tasks;
        std::queue<task_info>           m_completed_tasks;
        bool                            m_is_running = true;

        unsigned                        m_uuid = 0;
};

unsigned        cpu_core_count();
mutex_t         mutex();
void            destroy(mutex_t& mutex);
void            lock(mutex_t& mutex);
void            unlock(mutex_t& mutex);
task_info       run(if_task* task, if_task_storage* task_data = nullptr);
void            sync(task_info& info);

}

#endif // THREAD_H_INCLUDED

