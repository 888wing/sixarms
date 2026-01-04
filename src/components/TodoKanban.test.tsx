import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodoKanban } from './TodoKanban'
import type { Todo } from '../lib/types'

// Helper to create mock todo
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  title: 'Test Todo',
  priority: 'medium',
  status: 'pending',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

describe('TodoKanban', () => {
  const mockOnStatusChange = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all four columns', () => {
    render(
      <TodoKanban
        todos={[]}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('PENDING')).toBeInTheDocument()
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    expect(screen.getByText('CANCELLED')).toBeInTheDocument()
  })

  it('should display todos in correct columns', () => {
    const todos = [
      createMockTodo({ id: '1', title: 'Pending Task', status: 'pending' }),
      createMockTodo({ id: '2', title: 'In Progress Task', status: 'in_progress' }),
      createMockTodo({ id: '3', title: 'Completed Task', status: 'completed' }),
    ]

    render(
      <TodoKanban
        todos={todos}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Pending Task')).toBeInTheDocument()
    expect(screen.getByText('In Progress Task')).toBeInTheDocument()
    expect(screen.getByText('Completed Task')).toBeInTheDocument()
  })

  it('should display todo count in each column', () => {
    const todos = [
      createMockTodo({ id: '1', status: 'pending' }),
      createMockTodo({ id: '2', status: 'pending' }),
      createMockTodo({ id: '3', status: 'completed' }),
    ]

    render(
      <TodoKanban
        todos={todos}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    )

    // Check column counts - find by role or structure
    const allCounts = screen.getAllByText(/^[0-3]$/)
    expect(allCounts.length).toBeGreaterThan(0)
  })

  it('should display priority badges', () => {
    const todos = [
      createMockTodo({ id: '1', title: 'High Priority', priority: 'high', status: 'pending' }),
      createMockTodo({ id: '2', title: 'Urgent Task', priority: 'urgent', status: 'pending' }),
    ]

    render(
      <TodoKanban
        todos={todos}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()
  })

  it('should show empty state for columns without todos', () => {
    render(
      <TodoKanban
        todos={[]}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    )

    const dropZones = screen.getAllByText('Drop items here')
    expect(dropZones).toHaveLength(4)
  })

  it('should display due date when present', () => {
    const todos = [
      createMockTodo({ id: '1', title: 'With Due Date', due_date: '2025-06-15', status: 'pending' }),
    ]

    render(
      <TodoKanban
        todos={todos}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByText('Jun 15')).toBeInTheDocument()
  })
})
