function(doc){
  if (doc.type === 'background-task'){
    emit(doc.createdAt, null);
  }
}