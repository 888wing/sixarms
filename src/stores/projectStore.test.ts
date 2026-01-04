import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Project } from '../lib/types'

// Use vi.hoisted to define mocks that work with vi.mock hoisting
const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  createBatch: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
}))

// Mock the API module
vi.mock('../lib/api', () => ({
  projectApi: mocks,
}))

// Import store AFTER mock is set up
import { useProjectStore } from './projectStore'

// Helper to create mock project
const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: 'Test Project',
  path: '/path/to/project',
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useProjectStore.setState({
      projects: [],
      loading: false,
      error: null,
      selectedProjectId: null,
    })
    // Clear mock call history
    vi.clearAllMocks()
    // Reset mock implementations
    mocks.getAll.mockResolvedValue([])
    mocks.create.mockImplementation((name: string, path: string) =>
      Promise.resolve(createMockProject({ id: `new-${Date.now()}`, name, path }))
    )
    mocks.createBatch.mockResolvedValue([])
    mocks.updateStatus.mockResolvedValue(undefined)
    mocks.delete.mockResolvedValue(undefined)
  })

  describe('initial state', () => {
    it('should have empty projects array', () => {
      const state = useProjectStore.getState()
      expect(state.projects).toEqual([])
    })

    it('should have loading as false', () => {
      const state = useProjectStore.getState()
      expect(state.loading).toBe(false)
    })

    it('should have no error', () => {
      const state = useProjectStore.getState()
      expect(state.error).toBeNull()
    })

    it('should have no selected project', () => {
      const state = useProjectStore.getState()
      expect(state.selectedProjectId).toBeNull()
    })
  })

  describe('fetchProjects', () => {
    it('should set loading to true while fetching', async () => {
      mocks.getAll.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)))

      const fetchPromise = useProjectStore.getState().fetchProjects()
      expect(useProjectStore.getState().loading).toBe(true)

      await fetchPromise
    })

    it('should fetch and set projects', async () => {
      const mockProjects = [
        createMockProject({ id: '1', name: 'Project 1' }),
        createMockProject({ id: '2', name: 'Project 2' }),
      ]
      mocks.getAll.mockResolvedValue(mockProjects)

      await useProjectStore.getState().fetchProjects()

      const state = useProjectStore.getState()
      expect(state.projects).toEqual(mockProjects)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should set error on fetch failure', async () => {
      mocks.getAll.mockRejectedValue(new Error('Network error'))

      await useProjectStore.getState().fetchProjects()

      const state = useProjectStore.getState()
      expect(state.error).toBe('Error: Network error')
      expect(state.loading).toBe(false)
    })
  })

  describe('createProject', () => {
    it('should create and add a new project', async () => {
      const newProject = createMockProject({ id: 'new-1', name: 'New Project', path: '/new/path' })
      mocks.create.mockResolvedValue(newProject)

      const result = await useProjectStore.getState().createProject('New Project', '/new/path')

      expect(result).toEqual(newProject)
      expect(useProjectStore.getState().projects).toContainEqual(newProject)
      expect(mocks.create).toHaveBeenCalledWith('New Project', '/new/path')
    })

    it('should return null on creation failure', async () => {
      mocks.create.mockRejectedValue(new Error('Creation failed'))

      const result = await useProjectStore.getState().createProject('Test', '/path')

      expect(result).toBeNull()
      expect(useProjectStore.getState().error).toBe('Error: Creation failed')
    })
  })

  describe('createProjectsBatch', () => {
    it('should create multiple projects at once', async () => {
      const newProjects = [
        createMockProject({ id: '1', name: 'Project 1' }),
        createMockProject({ id: '2', name: 'Project 2' }),
      ]
      mocks.createBatch.mockResolvedValue(newProjects)

      const result = await useProjectStore.getState().createProjectsBatch([
        ['Project 1', '/path1'],
        ['Project 2', '/path2'],
      ])

      expect(result).toEqual(newProjects)
      expect(useProjectStore.getState().projects).toHaveLength(2)
    })

    it('should return empty array on batch creation failure', async () => {
      mocks.createBatch.mockRejectedValue(new Error('Batch failed'))

      const result = await useProjectStore.getState().createProjectsBatch([['Test', '/path']])

      expect(result).toEqual([])
    })
  })

  describe('updateProjectStatus', () => {
    it('should update project status', async () => {
      const project = createMockProject({ id: '1', status: 'active' })
      useProjectStore.setState({ projects: [project] })

      await useProjectStore.getState().updateProjectStatus('1', 'paused')

      const updatedProject = useProjectStore.getState().projects.find(p => p.id === '1')
      expect(updatedProject?.status).toBe('paused')
    })

    it('should set error on update failure', async () => {
      const project = createMockProject({ id: '1' })
      useProjectStore.setState({ projects: [project] })
      mocks.updateStatus.mockRejectedValue(new Error('Update failed'))

      await useProjectStore.getState().updateProjectStatus('1', 'archived')

      expect(useProjectStore.getState().error).toBe('Error: Update failed')
    })
  })

  describe('deleteProject', () => {
    it('should delete project from list', async () => {
      const projects = [
        createMockProject({ id: '1' }),
        createMockProject({ id: '2' }),
      ]
      useProjectStore.setState({ projects })

      await useProjectStore.getState().deleteProject('1')

      expect(useProjectStore.getState().projects).toHaveLength(1)
      expect(useProjectStore.getState().projects[0].id).toBe('2')
    })

    it('should clear selectedProjectId if deleted project was selected', async () => {
      const project = createMockProject({ id: '1' })
      useProjectStore.setState({ projects: [project], selectedProjectId: '1' })

      await useProjectStore.getState().deleteProject('1')

      expect(useProjectStore.getState().selectedProjectId).toBeNull()
    })

    it('should keep selectedProjectId if different project was deleted', async () => {
      const projects = [
        createMockProject({ id: '1' }),
        createMockProject({ id: '2' }),
      ]
      useProjectStore.setState({ projects, selectedProjectId: '2' })

      await useProjectStore.getState().deleteProject('1')

      expect(useProjectStore.getState().selectedProjectId).toBe('2')
    })
  })

  describe('selectProject', () => {
    it('should set selectedProjectId', () => {
      useProjectStore.getState().selectProject('project-1')
      expect(useProjectStore.getState().selectedProjectId).toBe('project-1')
    })

    it('should clear selectedProjectId when null is passed', () => {
      useProjectStore.setState({ selectedProjectId: 'project-1' })
      useProjectStore.getState().selectProject(null)
      expect(useProjectStore.getState().selectedProjectId).toBeNull()
    })
  })
})
