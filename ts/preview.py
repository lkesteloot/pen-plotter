# this python script is run from the command line
# and takes one input, which is an SVG filename

# https://axidraw.com/doc/py_api/#installation
from pyaxidraw import axidraw
import sys
import os

# Get the filename from the command line
filename = sys.argv[1]

ad = axidraw.AxiDraw()
ad.plot_setup(filename)

# https://axidraw.com/doc/py_api/#setting-options
ad.options.preview  = True
ad.options.report_time = True
ad.options.reordering = 2

ad.plot_run()
