import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Todo } from '../lib/types'

// Use vi.hoisted to define mocks that work with vi.mock hoisting
const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
}))

// Mock the API module
vi.mock('../lib/api', () => ({
  todoApi: mocks,
}))

// Import store AFTER mock is set up
import { useTodoStore } from './todoStore'

// Helper to create mock todo
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  title: 'Test Todo',
  priority: 'medium',
  status: 'pending',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

describe('todoStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTodoStore.setState({
      todos: [],
      loading: false,
      error: null,
    })
    // Clear mock call history
    vi.clearAllMocks()
    // Reset mock implementations
    mocks.getAll.mockResolvedValue([])
    mocks.create.mockImplementation((title: string) =>
      Promise.resolve(createMockTodo({ id: `new-${Date.now()}`, title }))
    )
    mocks.updateStatus.mockResolvedValue(undefined)
    mocks.delete.mockResolvedValue(undefined)
  })

  describe('initial state', () => {
    it('should have empty todos array', () => {
      const state = useTodoStore.getState()
      expect(state.todos).toEqual([])
    })

    it('should have loading as false', () => {
      const state = useTodoStore.getState()
      expect(state.loading).toBe(false)
    })

    it('should have no error', () => {
      const state = useTodoStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('computed properties', () => {
    const pendingTodo = createMockTodo({ id: '1', status: 'pending' })
    const inProgressTodo = createMockTodo({ id: '2', status: 'in_progress' })
    const completedTodo = createMockTodo({ id: '3', status: 'completed' })
    const cancelledTodo = createMockTodo({ id: '4', status: 'cancelled' })

    beforeEach(() => {
      useTodoStore.setState({
        todos: [pendingTodo, inProgressTodo, completedTodo, cancelledTodo],
      })
    })

    it('pendingTodos should return pending and in_progress todos', () => {
      const pending = useTodoStore.getState().pendingTodos()
      expect(pending).toHaveLength(2)
      expect(pending.map(t => t.id)).toEqual(['1', '2'])
    })

    it('completedTodos should return only completed todos', () => {
      const completed = useTodoStore.getState().completedTodos()
      expect(completed).toHaveLength(1)
      expect(completed[0].id).toBe('3')
    })
  })

  describe('todayTodos', () => {
    it('should return pending todos with today due date', () => {
      const today = new Date().toISOString().split('T')[0]
      const todayTodo = createMockTodo({ id: '1', due_date: today, status: 'pending' })
      const futureTodo = createMockTodo({ id: '2', due_date: '2099-12-31', status: 'pending' })

      useTodoStore.setState({ todos: [todayTodo, futureTodo] })

      const todayTodos = useTodoStore.getState().todayTodos()
      expect(todayTodos.find(t => t.id === '1')).toBeDefined()
      expect(todayTodos.find(t => t.id === '2')).toBeUndefined()
    })

    it('should return pending todos with no due date', () => {
      const noDueDateTodo = createMockTodo({ id: '1', status: 'pending' })
      delete (noDueDateTodo as any).due_date

      useTodoStore.setState({ todos: [noDueDateTodo] })

      const todayTodos = useTodoStore.getState().todayTodos()
      expect(todayTodos).toHaveLength(1)
    })

    it('should return completed todos from today', () => {
      const today = new Date().toISOString()
      const completedToday = createMockTodo({
        id: '1',
        status: 'completed',
        completed_at: today
      })
      const completedYesterday = createMockTodo({
        id: '2',
        status: 'completed',
        completed_at: '2020-01-01T00:00:00Z'
      })

      useTodoStore.setState({ todos: [completedToday, completedYesterday] })

      const todayTodos = useTodoStore.getState().todayTodos()
      expect(todayTodos.find(t => t.id === '1')).toBeDefined()
      expect(todayTodos.find(t => t.id === '2')).toBeUndefined()
    })
  })

  describe('fetchTodos', () => {
    it('should set loading to true while fetching', async () => {
      mocks.getAll.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      )

      const fetchPromise = useTodoStore.getState().fetchTodos()
      expect(useTodoStore.getState().loading).toBe(true)

      await fetchPromise
    })

    it('should fetch and set todos', async () => {
      const mockTodos = [
        createMockTodo({ id: '1', title: 'Todo 1' }),
        createMockTodo({ id: '2', title: 'Todo 2' }),
      ]
      mocks.getAll.mockResolvedValue(mockTodos)

      await useTodoStore.getState().fetchTodos()

      const state = useTodoStore.getState()
      expect(state.todos).toEqual(mockTodos)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should fetch with status filter', async () => {
      await useTodoStore.getState().fetchTodos('pending')

      expect(mocks.getAll).toHaveBeenCalledWith('pending')
    })

    it('should set error on fetch failure', async () => {
      mocks.getAll.mockRejectedValue(new Error('Network error'))

      await useTodoStore.getState().fetchTodos()

      const state = useTodoStore.getState()
      expect(state.error).toBe('Error: Network error')
      expect(state.loading).toBe(false)
    })
  })

  describe('createTodo', () => {
    it('should create and add a new todo at the beginning', async () => {
      const existingTodo = createMockTodo({ id: '1', title: 'Existing' })
      useTodoStore.setState({ todos: [existingTodo] })

      const newTodo = createMockTodo({ id: '2', title: 'New Todo' })
      mocks.create.mockResolvedValue(newTodo)

      const result = await useTodoStore.getState().createTodo('New Todo')

      expect(result).toEqual(newTodo)
      expect(useTodoStore.getState().todos[0]).toEqual(newTodo)
      expect(useTodoStore.getState().todos).toHaveLength(2)
    })

    it('should pass all parameters to API', async () => {
      const newTodo = createMockTodo()
      mocks.create.mockResolvedValue(newTodo)

      await useTodoStore.getState().createTodo('Test', 'project-1', 'high', '2025-12-31')

      expect(mocks.create).toHaveBeenCalledWith('Test', 'project-1', 'high', '2025-12-31')
    })

    it('should return null on creation failure', async () => {
      mocks.create.mockRejectedValue(new Error('Creation failed'))

      const result = await useTodoStore.getState().createTodo('Test')

      expect(result).toBeNull()
      expect(useTodoStore.getState().error).toBe('Error: Creation failed')
    })
  })

  describe('updateTodoStatus', () => {
    it('should update todo status', async () => {
      const todo = createMockTodo({ id: '1', status: 'pending' })
      useTodoStore.setState({ todos: [todo] })

      await useTodoStore.getState().updateTodoStatus('1', 'completed')

      const updatedTodo = useTodoStore.getState().todos.find(t => t.id === '1')
      expect(updatedTodo?.status).toBe('completed')
    })

    it('should set completed_at when marking as completed', async () => {
      const todo = createMockTodo({ id: '1', status: 'pending' })
      useTodoStore.setState({ todos: [todo] })

      await useTodoStore.getState().updateTodoStatus('1', 'completed')

      const updatedTodo = useTodoStore.getState().todos.find(t => t.id === '1')
      expect(updatedTodo?.completed_at).toBeDefined()
    })

    it('should not change completed_at when status is not completed', async () => {
      const todo = createMockTodo({ id: '1', status: 'pending', completed_at: undefined })
      useTodoStore.setState({ todos: [todo] })

      await useTodoStore.getState().updateTodoStatus('1', 'in_progress')

      const updatedTodo = useTodoStore.getState().todos.find(t => t.id === '1')
      expect(updatedTodo?.completed_at).toBeUndefined()
    })

    it('should set error on update failure', async () => {
      const todo = createMockTodo({ id: '1' })
      useTodoStore.setState({ todos: [todo] })
      mocks.updateStatus.mockRejectedValue(new Error('Update failed'))

      await useTodoStore.getState().updateTodoStatus('1', 'completed')

      expect(useTodoStore.getState().error).toBe('Error: Update failed')
    })
  })

  describe('deleteTodo', () => {
    it('should delete todo from list', async () => {
      const todos = [
        createMockTodo({ id: '1' }),
        createMockTodo({ id: '2' }),
      ]
      useTodoStore.setState({ todos })

      await useTodoStore.getState().deleteTodo('1')

      expect(useTodoStore.getState().todos).toHaveLength(1)
      expect(useTodoStore.getState().todos[0].id).toBe('2')
    })

    it('should set error on delete failure', async () => {
      const todo = createMockTodo({ id: '1' })
      useTodoStore.setState({ todos: [todo] })
      mocks.delete.mockRejectedValue(new Error('Delete failed'))

      await useTodoStore.getState().deleteTodo('1')

      expect(useTodoStore.getState().error).toBe('Error: Delete failed')
      // Todo should still be in the list
      expect(useTodoStore.getState().todos).toHaveLength(1)
    })
  })
})
