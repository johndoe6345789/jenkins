import { renderHook, act } from '@testing-library/react'
import { useToast } from '../hooks/useToast'

jest.useFakeTimers()

describe('useToast', () => {
  it('starts with empty toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toHaveLength(0)
  })

  it('push adds a toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.push('hello', 'success') })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].msg).toBe('hello')
    expect(result.current.toasts[0].type).toBe('success')
  })

  it('toast auto-removes after 3 s', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.push('bye') })
    expect(result.current.toasts).toHaveLength(1)
    act(() => { jest.advanceTimersByTime(3000) })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('defaults type to success', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.push('msg') })
    expect(result.current.toasts[0].type).toBe('success')
  })

  it('supports multiple concurrent toasts', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.push('a')
      result.current.push('b', 'error')
    })
    expect(result.current.toasts).toHaveLength(2)
  })
})
