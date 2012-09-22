function(doc){
  if (doc.type && doc.type === 'harvest'){
    var matches = /^(https?):\/\/([^\/]*)(\/.*)?$/.exec(doc.url);
    if (matches){
      emit(matches[2], null);
    }
  }
}