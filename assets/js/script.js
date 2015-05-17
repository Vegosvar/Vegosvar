$(window).load(function(){

  var currentTallest = 0,
       currentRowStart = 0,
       rowDivs = new Array(),
       $el,
       topPosition = 0;

   $('.resultContainer').each(function() {

     $el = $(this);
     topPostion = $el.position().top;
     
     if (currentRowStart != topPostion) {

       // we just came to a new row.  Set all the heights on the completed row
       for (currentDiv = 0 ; currentDiv < rowDivs.length ; currentDiv++) {
         $('.fetchHeight', rowDivs[currentDiv]).height(currentTallest);
         //console.log();
       }

       // set the variables for the new row
       rowDivs.length = 0; // empty the array
       currentRowStart = topPostion;
       currentTallest = $el.height();
       rowDivs.push($el);

     } else {

       // another div on the current row.  Add it to the list and check if it's taller
       rowDivs.push($el);
       currentTallest = (currentTallest < $el.height()) ? ($el.height()) : (currentTallest);

    }
     
    // do the last row
     for (currentDiv = 0 ; currentDiv < rowDivs.length ; currentDiv++) {
       $('.fetchHeight', rowDivs[currentDiv]).height(currentTallest);
     }

   });

  $(document).on('change', '.btn-file :file', function() {
    var input = $(this),
        numFiles = input.get(0).files ? input.get(0).files.length : 1,
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    input.trigger('fileselect', [numFiles, label]);
  });

  $(document).ready( function() {
      $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
          console.log(numFiles);
          console.log(label);
      });
  });

});

