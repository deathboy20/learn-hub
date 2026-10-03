import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allowed, progressPercent, scoreQuiz, transitionResource, validateUpload } from '../lib/domain'

describe('domain', () => {
  it('scores quizzes server-side', () => {
    const result = scoreQuiz([{ id: '1', points: 2, answer: 'True' }], { '1': 'true' })
    assert.equal(result.percentage, 100)
  })

  it('blocks invalid moderation transitions for lecturers', () => {
    assert.throws(() => transitionResource('pending', 'approved', false))
  })

  it('allows admin approval transitions', () => {
    assert.equal(transitionResource('pending', 'approved', true), 'approved')
  })

  it('calculates progress', () => {
    assert.equal(progressPercent(2, 4), 50)
  })

  it('validates upload mime/extension pairs', () => {
    assert.equal(validateUpload('notes.pdf', 'application/pdf', 1024), 'PDF')
  })

  it('enforces RBAC permissions', () => {
    assert.equal(allowed({ id: '1', name: 'A', email: 'a@x.com', role: 'student', status: 'active', permissions: ['courses.read'], programme_id: null, department_id: null, level: null }, 'courses.read'), true)
    assert.equal(allowed({ id: '1', name: 'A', email: 'a@x.com', role: 'student', status: 'active', permissions: [], programme_id: null, department_id: null, level: null }, 'users.manage'), false)
  })
})
