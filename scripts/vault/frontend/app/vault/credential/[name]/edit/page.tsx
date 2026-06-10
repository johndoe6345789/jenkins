'use client'
import { useEditPage } from '../../../../../hooks/useEditPage'
import { EditView } from '../../../../../components/EditView'
import '../../../../../lib/i18n'

export default function EditCredentialPage() {
  const {
    isAuth, credLabel, meta, setM, pw, lock,
    error, saving, saveMeta, savePassword,
    deleteCred, onPwChange, onBack,
  } = useEditPage()

  if (!isAuth) return null

  return (
    <EditView
      credLabel={credLabel}
      meta={meta} setM={setM}
      pw={pw} onPwChange={onPwChange}
      error={error} saving={saving}
      onSaveMeta={saveMeta} onSavePw={savePassword}
      onDelete={deleteCred} onBack={onBack}
      lock={lock}
    />
  )
}
