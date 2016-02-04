function sortMultidimensional(a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}

$(function() {
    var stats = []
    for (var i = pages_stats.length - 1; i >= 0; i--) {
        var entry = pages_stats[i]
        var date = new Date(entry._id).getTime()
        stats.push([date, entry.pages])
    }

    stats.sort(sortMultidimensional)

    pagesPerMonth(stats)
})