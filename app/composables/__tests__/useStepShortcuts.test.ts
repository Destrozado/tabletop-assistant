// Tests puros de resolveShortcutAction/shortcutsEnabled/isEditableTarget
// (D-Q1/D-Q2/D-Q4/D-Q7). NO se monta ningún composable ni se toca el DOM:
// el proyecto `app-logic` corre en entorno node, así que todos los eventos
// de teclado y todos los `target` son objetos planos con forma de pato.
import { describe, expect, it } from 'vitest'
import { isEditableTarget, resolveShortcutAction, shortcutsEnabled } from '../useStepShortcuts'
import type { ShortcutKeyEvent, ShortcutState } from '../useStepShortcuts'

// Helper local: todo en false/vacío por defecto, se sobrescribe solo el
// campo relevante para que cada test se lea de un vistazo.
function keyEvent(overrides: Partial<ShortcutKeyEvent> & { key: string }): ShortcutKeyEvent {
  return {
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isEditableTarget: false,
    ...overrides,
  }
}

function shortcutState(overrides: Partial<ShortcutState> = {}): ShortcutState {
  return {
    resumeResolved: true,
    hasSession: true,
    awaitingResumeChoice: false,
    awaitingContentChangedAck: false,
    awaitingDiscardConfirm: false,
    awaitingEndConfirm: false,
    isIndexOpen: false,
    hasActiveDetail: false,
    ...overrides,
  }
}

describe('resolveShortcutAction (D-Q1: el atajo es dueño de las tres teclas)', () => {
  it('Espacio, habilitado -> next', () => {
    expect(resolveShortcutAction(keyEvent({ key: ' ' }), true)).toBe('next')
  })

  it('Spacebar (variante heredada), habilitado -> next', () => {
    expect(resolveShortcutAction(keyEvent({ key: 'Spacebar' }), true)).toBe('next')
  })

  it('Enter, habilitado -> next', () => {
    expect(resolveShortcutAction(keyEvent({ key: 'Enter' }), true)).toBe('next')
  })

  it('ArrowLeft, habilitado -> back', () => {
    expect(resolveShortcutAction(keyEvent({ key: 'ArrowLeft' }), true)).toBe('back')
  })

  it('ArrowRight NO se mapea -> null', () => {
    expect(resolveShortcutAction(keyEvent({ key: 'ArrowRight' }), true)).toBeNull()
  })

  it.each(['a', 'Escape', 'Tab', 'ArrowDown'])('tecla no mapeada "%s" -> null', (key) => {
    expect(resolveShortcutAction(keyEvent({ key }), true)).toBeNull()
  })

  it.each([' ', 'Enter', 'ArrowLeft'])('enabled=false anula incluso "%s" -> null', (key) => {
    expect(resolveShortcutAction(keyEvent({ key }), false)).toBeNull()
  })

  it('repeat=true (autorrepetición) -> null, aunque la tecla sea Espacio', () => {
    expect(resolveShortcutAction(keyEvent({ key: ' ', repeat: true }), true)).toBeNull()
  })

  it('ctrlKey=true -> null', () => {
    expect(resolveShortcutAction(keyEvent({ key: ' ', ctrlKey: true }), true)).toBeNull()
  })

  it('metaKey=true -> null', () => {
    expect(resolveShortcutAction(keyEvent({ key: 'Enter', metaKey: true }), true)).toBeNull()
  })

  it('altKey=true -> null', () => {
    expect(resolveShortcutAction(keyEvent({ key: 'ArrowLeft', altKey: true }), true)).toBeNull()
  })

  it('shiftKey=true con Espacio -> next (D-Q7, decisión explícita, no olvido)', () => {
    expect(resolveShortcutAction(keyEvent({ key: ' ', shiftKey: true }), true)).toBe('next')
  })

  it('isEditableTarget=true -> null (Espacio en un campo de texto escribe un espacio)', () => {
    expect(resolveShortcutAction(keyEvent({ key: ' ', isEditableTarget: true }), true)).toBeNull()
  })
})

describe('shortcutsEnabled (D-Q4: cualquier overlay abierto desactiva el atajo)', () => {
  it('todo despejado -> true', () => {
    expect(shortcutsEnabled(shortcutState())).toBe(true)
  })

  it('resumeResolved=false -> false', () => {
    expect(shortcutsEnabled(shortcutState({ resumeResolved: false }))).toBe(false)
  })

  it('hasSession=false -> false', () => {
    expect(shortcutsEnabled(shortcutState({ hasSession: false }))).toBe(false)
  })

  it('awaitingResumeChoice=true -> false', () => {
    expect(shortcutsEnabled(shortcutState({ awaitingResumeChoice: true }))).toBe(false)
  })

  it('awaitingContentChangedAck=true -> false', () => {
    expect(shortcutsEnabled(shortcutState({ awaitingContentChangedAck: true }))).toBe(false)
  })

  it('awaitingDiscardConfirm=true -> false (aunque hoy solo aparezca anidado en awaitingResumeChoice)', () => {
    expect(shortcutsEnabled(shortcutState({ awaitingDiscardConfirm: true }))).toBe(false)
  })

  it('con la confirmación de partida terminada abierta -> false', () => {
    expect(shortcutsEnabled(shortcutState({ awaitingEndConfirm: true }))).toBe(false)
  })

  it('isIndexOpen=true -> false', () => {
    expect(shortcutsEnabled(shortcutState({ isIndexOpen: true }))).toBe(false)
  })

  it('hasActiveDetail=true -> false', () => {
    expect(shortcutsEnabled(shortcutState({ hasActiveDetail: true }))).toBe(false)
  })
})

describe('isEditableTarget (trampa 4: no robar la tecla a un campo de texto)', () => {
  it('null -> false', () => {
    expect(isEditableTarget(null)).toBe(false)
  })

  it('INPUT -> true', () => {
    expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true)
  })

  it('textarea (minúsculas, se normaliza) -> true', () => {
    expect(isEditableTarget({ tagName: 'textarea' })).toBe(true)
  })

  it('SELECT -> true', () => {
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true)
  })

  it('isContentEditable=true, sea cual sea el tagName -> true', () => {
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('BUTTON -> false (no es editable; el doble avance lo resuelve preventDefault, D-Q1)', () => {
    expect(isEditableTarget({ tagName: 'BUTTON' })).toBe(false)
  })

  it('DIV sin isContentEditable -> false', () => {
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false)
  })
})
