let deleteFile = function(fileName) {
  let ok = confirm(`Permanently delete ${fileName}?`)
  if(ok) window.location.href = '/delete/' + fileName
}
